export interface ExportSection {
  heading: string;
  body: string;
}

export interface ExportBundle {
  title: string;
  /** Small metadata lines shown under the title (department, technique, date…). */
  subtitleLines: string[];
  sections: ExportSection[];
}
