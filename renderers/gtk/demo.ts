import { Callback, Library, types } from "ffi-napi";
import ref from "ref-napi";

const gobject_manual = Library("/opt/homebrew/lib/libgobject-2.0.0.dylib", {
  'g_signal_connect_data': [types.ulong, [
    'pointer', // instance
    types.CString, // detailed_signal
    'pointer', //c_handler
    'pointer', // data
    'pointer', // GClosureNotify
    'uint32', // connect_flags
  ]]
});

const connect = (
  instance: gobj.Object,
  detailed_signal: string,
  c_handler: ref.Pointer<unknown>,
  data: ref.Pointer<unknown>,
) => {
  console.log("Calling Connect")
  return gobject_manual.g_signal_connect_data(
    (instance.pointer),
    (detailed_signal),
    (c_handler),
    (data),
    ref.NULL,
    0,
  )
}

const main = async () => {
  console.time("Import GTK");
  const gtk = await import('./gen/Gtk.ts');
  console.timeEnd("Import GTK");

  const onCleanup = new Callback(types.void, ['pointer', 'pointer'] as const, (_this, _data) => {
    const app = new gtk.Application(_this);
    console.log('WE UPP')
  });
  const onActivate = new Callback(types.void, ['pointer', 'pointer'] as const, (_this, _data) => {
    const app = new gtk.Application(_this);
    const win = gtk.ApplicationWindow.new(app);
    win.set_title("Hello!");
    win.set_default_size(200, 200);
    win.present();
  
    const but = gtk.Button.new_with_label("My Cool Button");
  
    win.set_child(but);
    
    console.log('WE UPP')
  });
  global.onActivate = onActivate;
  
  try {
    const app = gtk.Application.new("org.example.GtkApplication", 0);
    connect(app, "activate", onActivate, ref.NULL)
    
    app.run(0, ref.NULL);
  } catch (error) {
    console.error(error);
  }  
};


main();