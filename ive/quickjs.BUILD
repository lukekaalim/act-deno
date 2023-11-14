cc_library(
  name = "quickjs",
  srcs = glob(["*.c"], exclude=["qjs.c", "qjsc.c", "*test*"]),
  hdrs = glob(["*.h"]),
  visibility = ["//visibility:public"],
  local_defines = ["CONFIG_VERSION="]
)
