cmake_minimum_required(VERSION 3.10)
project(Server0)

set(CMAKE_CXX_STANDARD 17)

# ======================
# 1. 查找 Drogon
# ======================
find_package(Drogon REQUIRED)
find_package(OpenSSL REQUIRED)

# ======================
# 2. 查找 MySQL
# ======================
find_path(MYSQL_INCLUDE_DIR mysql/mysql.h
    PATHS /usr/include/
          /usr/local/include/
)

find_library(MYSQL_CLIENT_LIB mysqlclient
    PATHS /usr/lib
          /usr/lib/x86_64-linux-gnu
          /usr/local/lib
)

# ======================
# 3. 查找 GmSSL
# ======================
# find_path(GMSSL_INCLUDE_DIR gmssl/sm9.h
#     PATHS /usr/local/include/gmssl
#           /usr/include/gmssl
# )
# find_library(GMSSL_LIBRARY gmssl
#     PATHS /usr/local/lib
#           /usr/lib
#           /usr/lib/x86_64-linux-gnu
# )

# ======================
# 4. 查找 GMP 
# ======================
find_library(GMP_LIBRARY gmp
    PATHS /usr/lib
          /usr/lib/x86_64-linux-gnu
          /usr/local/lib
)
find_library(GMPXX_LIBRARY gmpxx
    PATHS /usr/lib
          /usr/lib/x86_64-linux-gnu
          /usr/local/lib
)

if (NOT GMP_LIBRARY OR NOT GMPXX_LIBRARY)
    message(FATAL_ERROR "❌ GMP or GMPXX library not found. Please install libgmp-dev and libgmpxx-dev")
endif()

# ======================
# 5. FSS 源码文件
# ======================
set(FSS_SOURCES
    ../fss/fss-client.cpp
    ../fss/fss-server.cpp
    ../fss/fss-common.cpp
)

# ======================
# 6. 可执行文件
# ======================
add_executable(S0
    server0.cpp
    ${FSS_SOURCES}
)

# ======================
# 7. 头文件路径
# ======================
target_include_directories(S0
    PRIVATE
    ${MYSQL_INCLUDE_DIR}
    ${OPENSSL_INCLUDE_DIRS} 
    
    /home/user/workplace/CryproDB/backend/fss/ # 如果 fss-*.cpp 的头文件在这里
)

# ======================
# 8. 链接所有需要的库
# ======================
target_link_libraries(S0
    PRIVATE
    Drogon::Drogon
    ${MYSQL_CLIENT_LIB}
    ${GMP_LIBRARY}
    ${GMPXX_LIBRARY}
    libfss.a
    ${OPENSSL_LIBRARIES}
    -L/usr/lib/x86_64-linux-gnu  # 原 Makefile 中的库路径
    -Wl,-Bstatic -lcrypto       # 静态链接 crypto
    -Wl,-Bdynamic               # 后续库动态链接
    -ldl                        # 原 Makefile 中的 -ldl
    -lssl                       # 原 Makefile 中的 -lssl
    -lgmpxx                     # 原 Makefile 中的 -lgmpxx
    -lgmp                       # 原 Makefile 中的 -lgmp
    -lpthread                   # 原 Makefile 中的 -lpthread
)