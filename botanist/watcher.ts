import { act } from "./dept.ts";

export const createWatchedComponent = <T extends Record<string, unknown>>(
  component: act.Component<T>,
  id: string,
): act.Component<T> => {

  const WrappedComponent: act.Component<T> = (props) => {
    console.log(`Rendered component ${id}`);
    return component(props);
  };

  return WrappedComponent;
};
