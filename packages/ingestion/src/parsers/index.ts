import { isRegistered, registerParser } from "../registry";
import type { Parser } from "../types/parser";
import { petpoojaDayWiseParser } from "./petpoojaDayWise";
import { petpoojaOrdersMasterParser } from "./petpoojaOrdersMaster";
import { pineLabsPosParser } from "./pineLabsPos";
import { pnlPdfParser } from "./pnlPdf";
import { swiggyAnnexureParser } from "./swiggyAnnexure";
import { zomatoAnnexureParser } from "./zomatoAnnexure";

const salesParsers = [
  petpoojaOrdersMasterParser,
  petpoojaDayWiseParser,
  pineLabsPosParser,
  pnlPdfParser,
  swiggyAnnexureParser,
  zomatoAnnexureParser,
];

for (const parser of salesParsers) {
  if (!isRegistered(parser.sourceType)) {
    registerParser(parser as unknown as Parser);
  }
}

export {
  petpoojaDayWiseParser,
  petpoojaOrdersMasterParser,
  pineLabsPosParser,
  pnlPdfParser,
  swiggyAnnexureParser,
  zomatoAnnexureParser,
};
