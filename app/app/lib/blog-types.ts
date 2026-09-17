import type { Timestamp } from "firebase/firestore";
import type { LandingFieldStyle } from "./landing-types";

export type BlogBlockType = "subtitle" | "paragraph" | "image";

export type BlogFieldStyle = LandingFieldStyle;

export type BlogBlock =
  | {
      id: string;
      type: "subtitle";
      text: string;
      style?: BlogFieldStyle;
    }
  | {
      id: string;
      type: "paragraph";
      text: string;
      style?: BlogFieldStyle;
    }
  | {
      id: string;
      type: "image";
      url: string;
      alt?: string;
      caption?: string;
      style?: BlogFieldStyle;
    };

export interface Blog {
  id: string;
  title: string;
  description: string;
  blocks: BlogBlock[];
  featured?: boolean;
  status: "draft" | "published";
  position?: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
