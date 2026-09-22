import { Command } from "commander";
import {SnippetAdd} from "../src/commads/snippetAdd"

const program = new Command()

program.command("add <name>")
.action((name)=> SnippetAdd(name))


program.parse()