import { Component, h } from "@lukekaalim/act";
import { InsightMode } from "./mode";
import { hs } from "@lukekaalim/act-web";

import classes from './MenuBar.module.css';

export type MenuBarProps = {
  currentMode: InsightMode,
  onSelectMode: (mode: InsightMode) => unknown,
}

export const MenuBar: Component<MenuBarProps> = ({ currentMode, onSelectMode }) => {
  return hs('menu', { className: classes.menuBar }, [
    hs('li', { className: classes.menuBarEntry },
      h(ModeButton, { onSelectMode, currentMode, mode: 'tree' }, 'Tree')),
    hs('li', { className: classes.menuBarEntry },
      h(ModeButton, { onSelectMode, currentMode, mode: 'thread' }, 'Thread')),
    hs('li', { className: classes.menuBarEntry },
      h(ModeButton, { onSelectMode, currentMode, mode: 'reports' }, 'Reports')),
  ])
};

type ModeButtonProps = {
  mode: InsightMode,
  currentMode: InsightMode,
  onSelectMode: (mode: InsightMode) => unknown,
}
const ModeButton: Component<ModeButtonProps> = ({ currentMode, mode, children, onSelectMode }) => {
  const selected = mode === currentMode;
  const onClick = () => {
    onSelectMode(mode);
  };

  return hs('button', {
    className: [classes.modeButton, selected && classes.selected].join(' '),
    onClick,
    disabled: selected
  }, children);
}