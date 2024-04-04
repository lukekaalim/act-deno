import * as glib from "./gen/GLib.ts";
import * as gtk from './gen/Gtk.ts';

try {
  const app = gtk.Application.new("MyApp", 0);
  console.log('Created App');
} catch (error) {
  console.error(error);
}