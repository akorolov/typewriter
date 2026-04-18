# typewriter

**Current version: 0.3.0**

An editor for creating branching narrative games. Try it out at typewriter.akorl.xyz

Typewriter lets you write interactive fiction one full branch at a time. Write the entire story end to end, and then go back and add additional branches. Or build out branches as you go. 

This is not a tool to build and deploy interactive fiction games. It is a tool for writers and game developers to have a nice clean place to write their story, which they can then export into the game engine of their choice. 

![Example](docs/example.jpg)

![Example 2](docs/example2.jpg)

![Example 3](docs/example3.jpg)

## Recent Changes

### v0.3.0 (2026-04-18)
- Various UI improvements
- Added full story export to markdown, with hyperlinks
- Fixed up some issues with merged branches not displaying properly or working as expected
- Added variable functionality
- Added a help page

### v0.2.2 (2026-04-14)
- Export current branch as markdown
- Expanded story map view
- Branch merging improvements
- Added back button from editor

### v0.2.1 (2026-04-12)
- Allow branches to recombine

### v0.2.0 (2026-04-10)
- Export to Twine format

## Roadmap

Planned features:
- [x] Export to Twine for build and deployment
- [ ] Potentially: export to renpy as well, although renpy has a different interactive fiction ethos. 
- [x] Export to standard markdown, text files, and json. Planned exports will also include a way to just export a complete single path as a markdown file, as well as other paths. Potentially also find a way to export into a format that you could turn into a print document nicely. 
- [x] First round of UI improvements
- [ ] Adding help hints, a tutorial, other onboarding
    - [x] Help page
    - [ ] Onboarding tutorial
- [x] Let branches recombine
    - [x] Almost done, but currently there's a bug where you can't switch branches nicely between a merged branch and a regular branch in the editor (but you can in the minimap).
    - [x] Also need to add in the functionality to switch to a branch path by clicking the pathway, i.e. so that you can open up the merged path 
- [x] Update how the player choice option works so that different nodes that lead to the same branch can have different player choices. 
- [x] Add something to track and set variables, ability to reference variables in the narrative without breaking the writing flow
- [ ] Templates/reusable blocks
- [x] Table of contents
- [x] Make outline look better/clean up sidebar
- [ ] Dark mode, other themes
- [ ] Automatic exports (for backup purposes)
- [x] Open up minimap into a bigger view
- [ ] Add markers/placeholders/bookmarks
- [x] Fix: merged branches don't show up in the branch info tab
- [ ] Allow conditionals to be attached to branch choices

## Using Variables

Twine offers the ability to use variables within stories, so there is basic functionality to set and track variables here as well. 

### Defining variables

In the variables tab in the side panel, you can define variables and choose string, number, or boolean (true/false). 

### Referencing a variable in text

Type `$` anywhere in the editor to open the variable autocomplete. Select a variable to insert a variable chip into your text. When exported, the chip becomes a live Harlowe variable reference that interpolates the current value.

### Setting a variable on a player choice

Open the branch info panel and find the branch you want. Under each player choice there is a variable effects section. Click add effect, choose a variable, and enter the value or expression to set when the player picks that choice.

The value field accepts raw Harlowe expressions, so you can write literal values or compute from the current state:

| Variable type | Example value | What it does |
|---|---|---|
| boolean | `true` | Sets the variable to true |
| boolean | `invert` | Toggles the variable to its opposite |
| number | `5` | Sets to a number |
| number | `$score + 10` | Increments by 10 |
| string | `"Alice"` | Sets to a string |
| string | `$name + " and Henry"` | Appends a string |

### How this exports to Twine

When you export to `.twee` (Harlowe format):

- A `StoryInit [startup]` passage is generated that sets all variables to their default values before the story begins.
- Variable chips in text export as `$variableName` — Harlowe interpolates them automatically.
- Branch effects with no variable effects export as standard `[[Choice->Passage]]` links.
- Branch effects *with* variable effects export using Harlowe's link macro so the variables are set at the moment the player clicks:

```
(link: "Take the sword")[(set: $hasSword to true)(go-to: "Forest Path")]
```

## Find and Replace

Use **Cmd+H** (MacOS) or **Ctrl+H** (Windows/Linux) to open Find & Replace. You can search for any text across all passages and replace it with either plain text or a variable chip.

## FAQ

### Who is this for?

This is for writers and game developers who want a place where they can write their story in a more narrative way, while still allow you to put in branching. This is meant to be a tool used in conjunction with other game engines like renpy or Twine, not a replacement for those. 

### Where is my data stored?

Your data is stored in your own browser local storage. There is no cloud storage, no external database, no cookies. Your data fully belongs to you for better or worse. Make sure to backup your story frequently!

More specifically, the app uses IndexedDB. Read more about it here: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API

### Is there any AI in this?

I used Claude Code to write the app, but the app itself does not use AI or have any AI features. The example story in the screenshots above does not include any generative AI (as you can probably tell...).

### Why would I use this over \<insert tool here\>?

You don't have to! This is a small hobby project and it's expected that there will be bugs and strange behavior. Please backup your work regularly.

But this tool is free, open source, has no ads, and your data never leaves your device. 

### How do I report a bug?

Go ahead and open an issue in this github project. I'll take a look as soon as I can!