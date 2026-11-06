/**
 * Caps for text that lives inside a fixed-height box.
 *
 * A `<Text>` with an explicit `lineHeight` keeps that height while its `fontSize` grows
 * with the reader's Dynamic Type setting, so an uncapped label clips. These two caps are
 * the only limits the client applies; prose stays uncapped so body text can grow freely.
 */

/** For a 22pt chip, an action row or a table cell: room to grow, no clipping. */
export const FIXED_GEOMETRY_FONT_CAP = 1.3

/** For a one-line dense row such as a drawer entry: the row cannot grow much. */
export const DENSE_ROW_FONT_CAP = 1.15
