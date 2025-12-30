use serde::{Deserialize, Serialize};
use tauri::{Manager, PhysicalPosition, PhysicalSize, WebviewWindow};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WindowState {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    pub maximized: bool,
}

impl Default for WindowState {
    fn default() -> Self {
        Self {
            x: 0,
            y: 0,
            width: 1400,
            height: 900,
            maximized: false,
        }
    }
}

fn get_state_file_path(window: &WebviewWindow) -> Option<PathBuf> {
    window
        .app_handle()
        .path()
        .app_data_dir()
        .ok()
        .map(|mut path: PathBuf| {
            path.push("window_state.json");
            path
        })
}

pub fn save_window_state(window: &WebviewWindow) -> Result<(), Box<dyn std::error::Error>> {
    let position = window.outer_position()?;
    let size = window.outer_size()?;
    let maximized = window.is_maximized()?;

    let state = WindowState {
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height,
        maximized,
    };

    if let Some(state_file) = get_state_file_path(window) {
        // Ensure parent directory exists
        if let Some(parent) = state_file.parent() {
            fs::create_dir_all(parent)?;
        }

        let json = serde_json::to_string_pretty(&state)?;
        fs::write(state_file, json)?;
    }

    Ok(())
}

pub fn restore_window_state(window: &WebviewWindow) -> Result<(), Box<dyn std::error::Error>> {
    if let Some(state_file) = get_state_file_path(window) {
        if state_file.exists() {
            let json = fs::read_to_string(state_file)?;
            let state: WindowState = serde_json::from_str(&json)?;

            // Restore window position and size
            window.set_position(PhysicalPosition::new(state.x, state.y))?;
            window.set_size(PhysicalSize::new(state.width, state.height))?;

            // Restore maximized state
            if state.maximized {
                window.maximize()?;
            }
        }
    }

    Ok(())
}

pub fn setup_window_state_listener(window: WebviewWindow) {
    // Save window state when it's moved or resized
    let window_clone = window.clone();
    window.on_window_event(move |event| {
        if let tauri::WindowEvent::Moved(_) | tauri::WindowEvent::Resized(_) = event {
            let _ = save_window_state(&window_clone);
        }
    });
}
