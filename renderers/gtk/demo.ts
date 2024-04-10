import { Callback, Library, types } from "ffi-napi";
import ref from "ref-napi";
import { Label } from "./gen/Gtk.ts";

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

const cbs = [];

interface PointerConstructable {
  new (pointer: ref.Pointer<unknown>): PointerConstructable;
}

const cast = (a: { pointer: ref.Pointer<unknown> }, B: PointerConstructable) => {
  return new B(a.pointer)
}

const connect = (
  instance: gobj.Object,
  detailed_signal: string,
  c_handler: ref.Pointer<unknown>,
  data: ref.Pointer<unknown>,
) => {
  console.log("Calling Connect")
  cbs.push(c_handler);
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
  const glib = await import("./gen/GLib.ts");
  const gio = await import("./gen/Gio.ts");
  console.timeEnd("Import GTK");

  const onCleanup = new Callback(types.void, ['pointer', 'pointer'] as const, (_this, _data) => {
    const app = new gtk.Application(_this);
    console.log('WE UPP')
  });
  const onActivate = new Callback(types.void, ['pointer', 'pointer'] as const, (_this, _data) => {
    try {
      console.log('Create Window')
      const app = new gtk.Application(_this);
      const win = new gtk.ApplicationWindow(gtk.ApplicationWindow.new(app).pointer);
    
      win.set_title("Hello!");
      win.set_default_size(200, 200);
      win.present();
    
      const but = new gtk.Button(gtk.Button.new_with_label("My Cool Button").pointer);
      
      connect(but, "clicked", new Callback(types.void, [], () => {
        console.log("CLICKED!!")
      }), ref.NULL)

      let num = 0;

      setInterval(() => {
        const l = new Label(but.get_child().pointer)
        l.set_text(`${num} Count`);
        num++;
      }, 1000);
    
      win.set_child(but);
      console.log("Setting child")
      
    } catch (error) {
      console.error(error)
    }
  });
  
  try {
    const app = gtk.Application.new("org.example.GtkApplication", 0);
    gtk.Application.activate
    connect(app, "activate", onActivate, ref.NULL);
    const ctx = glib.MainContext.default();
    
    const run = () => {
      ctx.acquire();
      ctx.iteration(false);
      id = setImmediate(run);
    };

    const c = gio.Cancellable.new();
    app.register(c);
    app.activate();
    let id = setImmediate(run);
  } catch (error) {
    console.error(error);
  }
};


main();