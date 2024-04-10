use std::env;
use std::path::PathBuf;

fn main() {
    system_deps::Config::new().probe().unwrap();

    let bindings = bindgen::Builder::default()
        .formatter(bindgen::Formatter::Prettyplease)
        .header("include.h")
        // Can feed these guys the array from system_deps... hopefully
        .clang_arg("-I/opt/homebrew/include/glib-2.0")
        .clang_arg("-I/opt/homebrew/Cellar/glib/2.80.0_2/lib/glib-2.0/include")
        
        .parse_callbacks(Box::new(bindgen::CargoCallbacks::new()))
  
        .generate()

        .expect("Unable to generate bindings");

    let out_path = PathBuf::from(env::var("OUT_DIR").unwrap());
    // Write the bindings to the bindings.rs file.
    bindings
        .write_to_file(out_path.join("bindings.rs"))
        .expect("Couldn't write bindings!");
}
