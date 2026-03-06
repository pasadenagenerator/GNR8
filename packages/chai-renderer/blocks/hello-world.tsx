import { registerChaiBlockProps, stylesProp } from "@chaibuilder/next/runtime";
import {
  ChaiBlockComponentProps,
  ChaiBlockConfig,
  ChaiStyles,
} from "@chaibuilder/next/types";

type Props = {
  name: string;
  styles: ChaiStyles;
};

const HelloWorld = (props: ChaiBlockComponentProps<Props>) => {
  const { name, styles, blockProps } = props;
  return (
    <div {...blockProps} {...styles}>
      <h1>Hello {name}</h1>
    </div>
  );
};

export const HelloWorldBlock: ChaiBlockConfig = {
  type: "hello-world",
  label: "Hello World",
  group: "Custom Blocks",
  props: registerChaiBlockProps({
    properties: {
      styles: stylesProp("text-lg font-bold underline"),
      name: { type: "string", title: "Name", default: "World" },
    },
  }),
};

export default HelloWorld;
