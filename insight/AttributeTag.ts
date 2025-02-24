import { Component } from "@lukekaalim/act";
import classes from './AttributeTag.module.css';
import stringHash from "@sindresorhus/string-hash";
import { hs } from "@lukekaalim/act-web";

export type CommitAttributeTagProps = {
  name: string,
  value: string,
}

export const CommitAttributeTag: Component<CommitAttributeTagProps> = ({ name, value }) => {
  const background = `hsl(${stringHash(name) % 360}deg, 50%, 50%)`;
  return hs('span', { className: classes.commitAttributeTag, style: { background } }, [
    hs('span', { className: classes.commitAttributeTagName }, name),
    hs('span', { className: classes.commitAttributeTagValue }, value),
  ])
}