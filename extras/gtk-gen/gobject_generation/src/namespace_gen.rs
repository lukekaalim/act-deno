use std::ffi::{CStr, CString};

use gobject_introspection::*;

enum GBaseInfoTypes {
  Object,
  Struct,
  Function,
  //Field,
  //Arg,
  //Type,

  Unknown,
}

fn calc_baseinfo_type(info: *mut _GIBaseInfo) -> GBaseInfoTypes {
  unsafe {
    if g_type_check_instance_is_a(info.cast(), gi_object_info_get_type()) == 1 {
      return GBaseInfoTypes::Object;
    } else if g_type_check_instance_is_a(info.cast(), gi_struct_info_get_type()) == 1 {
      return GBaseInfoTypes::Struct;
    } else if g_type_check_instance_is_a(info.cast(), gi_function_info_get_type()) == 1 {
      return GBaseInfoTypes::Function;
    } else {
      return GBaseInfoTypes::Unknown;
    }
  }
}

pub fn generate(repo: *mut _GIRepository, namespace: CString) -> codegen::Module {
  let mut module = codegen::Module::new(namespace.to_str().unwrap());

  unsafe {
    let info_count = gi_repository_get_n_infos(repo, namespace.as_ptr());
    println!("Info count! {}", info_count.to_string());
  
    let mut i = 0;
    while i < info_count {
      let info = gi_repository_get_info(repo, namespace.as_ptr(), i);
      let name_ptr = gi_base_info_get_name(info);
      let namespace_ptr = gi_base_info_get_namespace(info);
  
      let name = CStr::from_ptr(name_ptr).to_str().unwrap();
      let namespace = CStr::from_ptr(namespace_ptr).to_str().unwrap();
      println!("Info {}.{}", namespace, name);

      let info_type = calc_baseinfo_type(info);

      match info_type {
        GBaseInfoTypes::Object => {
          let object_info = g_type_check_instance_cast(
            info.cast(),
            gi_object_info_get_type()
          ) as *mut _GIObjectInfo;
          let object_method_count = gi_object_info_get_n_methods(object_info);
          println!("Has {} methods!", object_method_count.to_string());
        },
        GBaseInfoTypes::Struct => {
          let struct_info = g_type_check_instance_cast(
            info.cast(),
            gi_struct_info_get_type()
          ) as *mut _GIStructInfo;
          let codegen_struct = codegen::Struct::new(name);

          module.push_struct(codegen_struct);

          let struct_method_count = gi_struct_info_get_n_methods(struct_info);
          println!("Has {} methods!", struct_method_count.to_string());
        }
        GBaseInfoTypes::Function => {
          let func_info = g_type_check_instance_cast(
            info.cast(),
            gi_function_info_get_type()
          ) as *mut _GIFunctionInfo;

          let arg_count = gi_callable_info_get_n_args(func_info.cast());
          let mut ii = 0;
          let mut args = Vec::new();
          while ii < arg_count {
            args.push(
              gi_callable_info_get_arg(func_info.cast(), ii)
            );
            ii += 1;
          }

          let arg_segments: Vec<&str> = args.iter().map(|arg| {
            return CStr::from_ptr(gi_base_info_get_name(arg.cast())).to_str().unwrap();
          }).collect();
          let arg_line = arg_segments.join(",");
          
          let mut codegen_func = codegen::Function::new(name);
          codegen_func.attr("napi");
          let code_line = format!("return {}({})", name, arg_line);
          codegen_func.line(code_line);
          module.push_fn(codegen_func);
        }
        _ => ()
      }

      gi_base_info_unref(info.cast());
      i = i + 1;
    }
  }

  return module;
}
