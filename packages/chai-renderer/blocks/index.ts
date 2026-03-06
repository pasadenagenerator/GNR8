import { registerChaiBlock } from "@chaibuilder/next/runtime";
import dynamic from "next/dynamic";
import { HelloWorldBlock } from "./hello-world";
import { FormConfig } from "./form/form-block";

//Important: Dynamic import is required for custom blocks
const HelloWorld = dynamic(() => import("./hello-world"));
const ChaiForm = dynamic(() => import("./form/form-block"));

export const registerCustomBlocks = () => {
  registerChaiBlock(HelloWorld, HelloWorldBlock);
  registerChaiBlock(ChaiForm, FormConfig);
};
