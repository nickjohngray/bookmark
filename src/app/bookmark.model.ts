/* -------------------------------------------------------------------------
   Bookmark model interface

   Purpose:
   - Defines the shape of a bookmark object used throughout the application.
   - Ensures type safety in TypeScript so that all bookmarks have the same
     required properties.

   Properties:
   - `id`  : A unique string identifier for this bookmark.
             Typically generated when the bookmark is first created.
             Used to track and update/delete the correct item in arrays.
   - `url` : The full URL string for the bookmark.
             Expected to be a valid, normalized URL (with protocol).
             Displayed to the user and used for navigation/preview.

   Benefits:
   - Centralizes the bookmark structure in one place, making it easy to update
     if requirements change.
   - Any component, service, or utility function that consumes bookmarks
     can rely on this consistent shape.
------------------------------------------------------------------------- */
export interface Bookmark {
  id: string;
  url: string;
}
