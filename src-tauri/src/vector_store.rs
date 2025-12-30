use lancedb::connect;
use lancedb::Connection;
use lancedb::table::Table;
use lancedb::query::{ExecutableQuery, QueryBase};
use arrow_array::{RecordBatch, StringArray, Float32Array, FixedSizeListArray, Array, RecordBatchIterator, ArrayRef};
use arrow_schema::{Schema, Field, DataType};
use std::sync::Arc;
use tauri::{AppHandle, Manager};
use serde::{Deserialize, Serialize};
use futures::TryStreamExt;
use fastembed::{InitOptions, TextEmbedding, EmbeddingModel};

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchResult {
    pub id: String,
    pub text: String,
    pub score: f32,
}

#[derive(Clone)]
pub struct VectorStore {
    db: Arc<Connection>,
    table_name: String,
    embedding_model: Arc<TextEmbedding>,
}

impl VectorStore {
    pub async fn new(app_handle: &AppHandle) -> Result<Self, Box<dyn std::error::Error>> {
        let app_dir = app_handle.path().app_data_dir()?;
        let db_path = app_dir.join("lancedb");
        std::fs::create_dir_all(&db_path)?;
        
        let db = connect(&db_path.to_string_lossy()).execute().await?;
        
        // Initialize FastEmbed with AllMiniLML6V2 (384 dims)
        let mut options = InitOptions::default();
        options.model_name = EmbeddingModel::AllMiniLML6V2;
        options.show_download_progress = true;
        let model = TextEmbedding::try_new(options)?;

        Ok(Self {
            db: Arc::new(db),
            table_name: "knowledge_base".to_string(),
            embedding_model: Arc::new(model),
        })
    }

    async fn get_table(&self, create_if_missing: bool) -> Result<Table, Box<dyn std::error::Error>> {
        if create_if_missing {
            match self.db.open_table(&self.table_name).execute().await {
                Ok(t) => Ok(t),
                Err(_) => {
                    let schema = Arc::new(Schema::new(vec![
                        Field::new("id", DataType::Utf8, false),
                        Field::new("text", DataType::Utf8, false),
                        Field::new("vector", DataType::FixedSizeList(
                            Arc::new(Field::new("item", DataType::Float32, true)),
                            384 
                        ), false),
                    ]));
                    
                    let empty_batch = RecordBatch::new_empty(schema.clone());
                    let reader = RecordBatchIterator::new(vec![Ok(empty_batch)].into_iter(), schema.clone());
                    
                    self.db.create_table(&self.table_name, reader).execute().await.map_err(|e| Box::new(e) as Box<dyn std::error::Error>)
                }
            }
        } else {
            self.db.open_table(&self.table_name).execute().await.map_err(|e| Box::new(e) as Box<dyn std::error::Error>)
        }
    }

    fn create_fixed_list_array(embedding: &[f32], _num_rows: usize, dims: i32) -> FixedSizeListArray {
        // Create the values array (flat array of all embeddings)
        let values = Float32Array::from_iter_values(embedding.iter().copied());
        let values_ref: ArrayRef = Arc::new(values);
        
        // Create the fixed size list array
        let field = Arc::new(Field::new("item", DataType::Float32, true));
        FixedSizeListArray::new(field, dims, values_ref, None)
    }

    pub async fn index_document(&self, id: &str, text: &str) -> Result<(), Box<dyn std::error::Error>> {
        let documents = vec![text.to_string()];
        let embeddings = self.embedding_model.embed(documents, None)?;
        let embedding = embeddings.first().ok_or("Failed to generate embedding")?;
        
        if embedding.len() != 384 {
            return Err(format!("Embedding size mismatch: expected 384, got {}", embedding.len()).into());
        }

        let schema = Arc::new(Schema::new(vec![
            Field::new("id", DataType::Utf8, false),
            Field::new("text", DataType::Utf8, false),
            Field::new("vector", DataType::FixedSizeList(
                Arc::new(Field::new("item", DataType::Float32, true)),
                384
            ), false),
        ]));

        let id_array = StringArray::from(vec![id]);
        let text_array = StringArray::from(vec![text]);
        let vector_array = Self::create_fixed_list_array(embedding, 1, 384);

        let batch = RecordBatch::try_new(
            schema.clone(),
            vec![
                Arc::new(id_array),
                Arc::new(text_array),
                Arc::new(vector_array),
            ],
        )?;

        let tbl = self.get_table(true).await?;
        tbl.add(RecordBatchIterator::new(vec![Ok(batch)], schema)).execute().await?;
        
        Ok(())
    }

    pub async fn search(&self, query: &str) -> Result<Vec<SearchResult>, Box<dyn std::error::Error>> {
        let documents = vec![query.to_string()];
        let embeddings = self.embedding_model.embed(documents, None)?;
        let query_vector = embeddings.into_iter().next().ok_or("Failed to embed query")?;

        let tbl = self.get_table(false).await?;
        
        // Use owned Vec<f32> for query
        let results = tbl.query()
            .nearest_to(query_vector)?
            .limit(5)
            .execute()
            .await?;
            
        let mut search_results = Vec::new();
        let mut stream = results;
        
        while let Some(batch) = stream.try_next().await? {
            let ids: &StringArray = batch.column_by_name("id").ok_or("Missing id column")?.as_any().downcast_ref().ok_or("Invalid id type")?;
            let texts: &StringArray = batch.column_by_name("text").ok_or("Missing text column")?.as_any().downcast_ref().ok_or("Invalid text type")?;
            
            for i in 0..batch.num_rows() {
                search_results.push(SearchResult {
                    id: ids.value(i).to_string(),
                    text: texts.value(i).to_string(),
                    score: 0.0, 
                });
            }
        }
        
        Ok(search_results)
    }

    pub async fn create_table(&self) -> Result<(), Box<dyn std::error::Error>> {
        self.get_table(true).await?;
        Ok(())
    }
}

