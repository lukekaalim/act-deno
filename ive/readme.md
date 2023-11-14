# Act-Ive

Ive is a small bundle of tools for rendering
act elements on iOS, Android, and other more
exotic targets.

The main contribution here is a renderer, but
often there are other pieces of work (like
spinning up a javascript engine) that are
required before we can start rendering.

## TODO

 - [x] QuickJS C Library Compiles
 - [] QuickJS KotlinAPI
 - [] QuickJS SwiftAPI

```
docker run -ti -v $(pwd):/tmp gcr.io/bazel-public/bazel:latest /bin/bash
```