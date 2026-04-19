import { ParserNotImplementedError } from "../errors";
import type {
  CommitContext,
  NormalizeContext,
  NormalizeResult,
  ParseContext,
  ParseResult,
  Parser,
  RollbackContext,
} from "../types/parser";
import { filenameMatches } from "./helpers";

interface ZomatoRecordStub {
  rowNumber: number;
}

export const zomatoAnnexureParser: Parser<ZomatoRecordStub, ZomatoRecordStub> = {
  sourceType: "zomato_annexure",
  displayName: "Zomato Annexure",
  acceptedExtensions: ["xlsx", "xls"],

  async detect(ctx) {
    if (filenameMatches(ctx.fileName.toLowerCase(), /zomato/)) {
      return { confidence: 0.8, reason: "Filename includes zomato." };
    }
    return { confidence: 0, reason: "No Zomato signals found." };
  },

  async parse(_ctx: ParseContext): Promise<ParseResult<ZomatoRecordStub>> {
    throw new ParserNotImplementedError(
      "Zomato parser awaiting sample file. Please contact admin so we can build this."
    );
  },

  async normalize(
    _ctx: NormalizeContext<ZomatoRecordStub>
  ): Promise<NormalizeResult<ZomatoRecordStub>> {
    return { toInsert: [], duplicateCount: 0 };
  },

  async commit(_ctx: CommitContext<ZomatoRecordStub>) {
    return { rowsInserted: 0 };
  },

  async rollback(_ctx: RollbackContext) {},
};
