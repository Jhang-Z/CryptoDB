cmake_minimum_required(VERSION 3.10)
project(fss CXX)

# ======================
# 1. 基础配置（与原 Makefile 对齐）
# ======================
set(CMAKE_CXX_STANDARD 11)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# 原 Makefile 中的编译选项（按顺序保留）
set(COMMON_COMPILE_FLAGS 
    -fomit-frame-pointer 
    -maes 
    -msse4.2 
    -fno-strict-aliasing 
    -pedantic 
    -Wall 
    -Wextra 
    -Wunreachable-code 
    -Wmissing-declarations 
    -Wunused-function 
    -Wno-overlength-strings 
    -Wno-deprecated-declarations 
    -O3
)

# 原 Makefile 中的安装前缀（默认 /usr/local）
set(PREFIX "/usr/local" CACHE PATH "Installation prefix")

# ======================
# 2. 条件编译选项（AESNI）
# ======================
option(AESNI "Enable AES-NI support" OFF)
if(AESNI)
    list(APPEND COMMON_COMPILE_FLAGS -DAESNI)
endif()

# ======================
# 3. 源文件与目标定义
# ======================
# 静态库源文件（原 Makefile 中用于生成 libfss.a 的文件）
set(LIB_SOURCES 
    fss-client.cpp 
    fss-server.cpp 
    fss-common.cpp
)

# 可执行文件源文件（原 Makefile 中的 fss-test.cpp）
set(EXEC_SOURCES 
    fss-test.cpp
)

# ======================
# 4. 生成静态库 libfss.a
# ======================
add_library(fss STATIC ${LIB_SOURCES})
target_compile_options(fss PRIVATE ${COMMON_COMPILE_FLAGS})

# ======================
# 5. 生成可执行文件 fss-test
# ======================
add_executable(fss-test ${EXEC_SOURCES})
target_compile_options(fss-test PRIVATE ${COMMON_COMPILE_FLAGS})

# 链接依赖库（与原 Makefile 的 LDFLAGS 对齐）
target_link_libraries(fss-test PRIVATE 
    fss  # 链接静态库
    -L/usr/lib/x86_64-linux-gnu  # 原 Makefile 中的库路径
    -Wl,-Bstatic -lcrypto       # 静态链接 crypto
    -Wl,-Bdynamic               # 后续库动态链接
    -ldl                        # 原 Makefile 中的 -ldl
    -lssl                       # 原 Makefile 中的 -lssl
    -lgmpxx                     # 原 Makefile 中的 -lgmpxx
    -lgmp                       # 原 Makefile 中的 -lgmp
    -lpthread                   # 原 Makefile 中的 -lpthread
)

# ======================
# 6. 安装规则（与原 Makefile 对齐）
# ======================
install(TARGETS fss
    ARCHIVE 
        DESTINATION ${PREFIX}/lib
        PERMISSIONS OWNER_READ OWNER_WRITE GROUP_READ WORLD_READ
)

install(FILES 
    fss-client.h 
    fss-server.h 
    fss-common.h 
    DESTINATION 
        ${PREFIX}/include/fss
    PERMISSIONS OWNER_READ GROUP_READ WORLD_READ
)

# ======================
# 7. 可选：打印配置信息（调试用）
# ======================
message(STATUS "Build type: ${CMAKE_BUILD_TYPE}")
message(STATUS "AESNI enabled: ${AESNI}")
message(STATUS "Install prefix: ${PREFIX}")