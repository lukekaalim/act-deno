use std::ffi::{CStr, CString};
use std::io::Write;

use gobject_introspection::*;

use crate::namespace_gen;

pub fn generate() {
  unsafe {
    let mut error_p: *mut _GError = std::ptr::null_mut();
    let error_p_p: *mut *mut _GError = &mut error_p;

    let namespace = CString::new("GLib").unwrap();
    let version = CString::new("2.0").unwrap();

    let repo = gi_repository_new();
    if repo.is_null() {
      println!("Repo is null?");
      return;
    }

    let mut n_paths_out: usize = 0;
    let n_paths_out_pointer = &mut n_paths_out as *mut usize;
    let search = CString::new("/usr/local/lib/girepository-1.0").unwrap();
    gi_repository_prepend_search_path(repo, search.as_ptr());

    let paths = gi_repository_get_search_path(repo, n_paths_out_pointer);

    //let path_count = *n_paths_out;
    println!("Path Count {}", n_paths_out);

    let slice =  std::slice::from_raw_parts(paths, n_paths_out);

    for (_i, elem) in slice.iter().enumerate() {
      println!("{}", CStr::from_ptr(*elem).to_str().unwrap());
    }

    gi_repository_require(
      repo,
      namespace.as_ptr(),
      version.as_ptr(),
      0,
      error_p_p
    );
    if error_p.is_null() {
      println!("Happy as can be!");
      let module = namespace_gen::generate(repo, namespace);
      let mut scope = codegen::Scope::new();
      scope.push_module(module);
      let sourcecode = scope.to_string();
      let mut file = std::fs::File::create("foo.txt").unwrap();
      file.write_all(sourcecode.as_bytes()).unwrap();
    } else {
      println!("{}", CStr::from_ptr(error_p.read().message).to_str().unwrap());
    }
  }
}
