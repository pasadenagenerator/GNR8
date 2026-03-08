import { registerChaiBlock } from "@chaibuilder/next/runtime";
import dynamic from "next/dynamic";
import { HelloWorldBlock } from "./hello-world";

// Important: Dynamic import is required for custom blocks
const HelloWorld = dynamic(() => import("./hello-world"));

export const registerCustomBlocks = () => {
  registerChaiBlock(HelloWorld, HelloWorldBlock);
};