# This is a multistage Docker build.
# Requires Docker 17.06 CE or later
#
# Stage -1: Build ant
FROM openjdk:11-jdk AS ant

RUN apt-get update && apt-get install -y ant

# Stage 0: Build viewer
# (We use webratio/ant here because we use it in stages 1 and 2.  Using the same
# base image here likely avoids having to download yet another image.)
FROM ant AS viewer
RUN apt-get update && apt-get install -y rsync zip
COPY NGCHM /NGCHM/

ENV VIEWER=/artifacts/viewer
ENV WC=/NGCHM/WebContent
RUN mkdir -p ${VIEWER} &&\
    rsync -a ${WC}/chm.html ${WC}/chmHelp.html ${WC}/icons.svg ${WC}/css ${WC}/images ${WC}/javascript ${VIEWER}/ &&\
    (cd ${VIEWER}/ && zip -q -r -9 NGCHM_FileApp.zip .)


# Stage 1: Create Shaidy R MapGen
FROM ant AS shaidy
ARG GIT_COMMIT
ARG GIT_LATEST_TAG
COPY NGCHM /NGCHM/

ENV SMAPGEN=/artifacts/shaidymapgen
RUN mkdir -p ${SMAPGEN} &&\
    ant -f NGCHM/build_shaidyRmapgen.xml -Dmapgen.path=${SMAPGEN}/ShaidyMapGen.jar

# Stage 2: Create Galaxy MapGen
FROM ant AS galaxy
ARG GIT_COMMIT
ARG GIT_LATEST_TAG
COPY NGCHM /NGCHM/

ENV GMAPGEN=/artifacts/galaxymapgen

RUN mkdir -p ${GMAPGEN} &&\
    ant -f NGCHM/build_galaxymapgen.xml -Dmapgen.path=${GMAPGEN}/GalaxyMapGen.jar

# Stage 3: Create NG-CHM Standalone
FROM ant AS standalone
ARG GIT_COMMIT
ARG GIT_LATEST_TAG
COPY NGCHM /NGCHM/

ENV STANDALONE=/artifacts/standalone
ENV SERVERAPP=/artifacts/server.app

RUN mkdir -p ${STANDALONE} &&\
    mkdir -p ${SERVERAPP} &&\
    cd /NGCHM &&\
    ant -f build_ngchmApp.xml &&\
    cp ngchmWidget-min.js ${STANDALONE} &&\
    cp ngchmEmbed-min.js ${STANDALONE} &&\
    cp WebContent/ngChmApp.html ${STANDALONE} &&\
    cp -R WebContent/server.app /artifacts/

# Stage 4: Create GUIBuilderMapGen
FROM ant AS builder
ARG GIT_COMMIT
ARG GIT_LATEST_TAG
COPY NGCHM /NGCHM/

ENV BMAPGEN=/artifacts/builder
RUN mkdir -p ${BMAPGEN} &&\
    ant -f NGCHM/build_guibuildermapgen.xml -Dmapgen.path=${BMAPGEN}/GUIBuilderMapGen.jar

# Final stage: copy artifacts from previous stages into a minimal layer
FROM multiarch/true:x86_64

VOLUME /NGCHM

COPY --from=viewer /artifacts/viewer  /NGCHM/viewer
COPY --from=shaidy /artifacts/shaidymapgen /NGCHM/shaidymapgen
COPY --from=galaxy /artifacts/galaxymapgen /NGCHM/galaxymapgen
COPY --from=standalone /artifacts/standalone /NGCHM/standalone
COPY --from=standalone /artifacts/server.app /NGCHM/server.app
COPY --from=builder /artifacts/builder /NGCHM/buildermapgen
