# typewriter

An editor for creating branching narrative games. Try it out at typewriter.akorl.xyz

Typewriter lets you write interactive fiction one full branch at a time. Write the entire story end to end, and then go back and add additional branches. Or build out branches as you go. 

This is not a tool to build and deploy interactive fiction games. It is a tool for writers and game developers to have a nice clean place to write their story, which they can then export into the game engine of their choice. 

![Example](docs/example.jpg)

![Example 2](docs/example2.jpg)

![Example 3](docs/example3.jpg)

## Roadmap

Planned features:
- [ ] Export to Twine for build and deployment
- [ ] Potentially: export to renpy as well, although renpy has a different interactive fiction ethos. 
- [ ] Export to standard markdown, text files, and json. Planned exports will also include a way to just export a complete single path as a markdown file, as well as other paths. 
- [ ] Additional UI improvements
- [ ] Adding help hints, a tutorial, other onboarding
- [ ] Let branches recombine
- [ ] Add something to track and set variables, ability to reference variables in the narrative without breaking the writing flow
- [ ] Templates/reusable blocks
- [ ] Table of contents
- [ ] Dark mode, other themes


## FAQ

### Who is this for?

This is for writers and game developers who want a place where they can write their story in a more narrative way, while still allow you to put in branching. This is meant to be a tool used in conjunction with other game engines like renpy or Twine, not a replacement for those. 

### Where is my data stored?

Your data is stored in your own browser local storage. There is no cloud storage, no external database, no cookies. Your data fully belongs to you for better or worse. Make sure to backup your story frequently!

More specifically, the app uses IndexedDB. Read more about it here: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API

### Is there any AI in this?

I used Claude Code to write the app, but the app itself does not use AI or have any AI features. The example story in the screenshots above does not include any generative AI (as you can probably tell...)