import { assertEquals } from "https://deno.land/std@0.204.0/assert/mod.ts";
import { act, recon } from "./mod.ts";

const { h } = act;

Deno.test(function addTest() {
  const NameDisplay: act.Component<{ name: string }> = ({ name }) => {
    return name
  };

  const App: act.Component<{ name: string }> = ({ name }) => {
    return h("Hello", {}, ["There", h(NameDisplay, { name })])
  };
  const commits = new Map<recon.CommitID, recon.Commit>();
  const stateManager = recon.createStateManager();
  const deltaManager = recon.createDeltaManager(stateManager, commits);
  const threadManger = recon.createThreadManager(deltaManager, commits, thread => {
    console.log(thread.completedDeltas)
  });
  const tree = recon.createTree(threadManger, commits);

  tree.mount(h(App, { name: 'string' }));

  tree.unmount();
});
