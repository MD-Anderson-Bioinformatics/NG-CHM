# NG-CHM
The NG-CHM Heat Map Viewer is a dynamic, graphical environment for exploration of clustered or
non-clustered heat map data in a web browser.
It supports zooming, panning, searching, covariate bars, and link-outs
that enable deep exploration of patterns and associations in heat maps.
This [demo video](https://youtu.be/DuObpGNpDhw) quickly demonstrates the viewer's major features.

The project [homepage](https://bioinformatics.mdanderson.org/main/NG-CHM-V2:Overview)
includes additional documentation, introductory videos, and tutorials. 

To build image:

```bash
docker build \
       --build-arg="GIT_COMMIT=$(git rev-parse --short HEAD)" \
       --build-arg="GIT_LATEST_TAG=$(git describe --tags --abbrev=0)" \
       -t ngchm:latest .
```
