/** Base class for errors caused by input data rather than by a bug in tally. */
export class TallyError extends Error {
  override name = "TallyError";
}
