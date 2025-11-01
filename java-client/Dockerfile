# Use x86_64 platform for launch4j compatibility (works on both Intel and Apple Silicon via emulation)
FROM --platform=linux/amd64 openjdk:8-jdk

# Install build dependencies
RUN apt-get update && \
    apt-get install -y \
    wget \
    unzip \
    file \
    && rm -rf /var/lib/apt/lists/*

# Download and install Launch4j manually
RUN wget -q https://sourceforge.net/projects/launch4j/files/launch4j-3/3.14/launch4j-3.14-linux-x64.tgz/download -O /tmp/launch4j.tgz && \
    tar -xzf /tmp/launch4j.tgz -C /opt && \
    rm /tmp/launch4j.tgz && \
    chmod +x /opt/launch4j/launch4j && \
    printf '#!/bin/bash\ncd /opt/launch4j && ./launch4j "$@"\n' > /usr/local/bin/launch4jc && \
    chmod +x /usr/local/bin/launch4jc

# Set working directory
WORKDIR /app

# Copy Gradle wrapper files first (for better caching)
COPY gradlew .
COPY gradle ./gradle

# Copy build configuration files
COPY build.gradle .
COPY settings.gradle .

# Copy source code
COPY src ./src

# Copy Launch4j configuration files
COPY launch4j-*.xml ./

# Make gradlew executable and verify
RUN chmod +x ./gradlew && \
    ls -l ./gradlew && \
    file ./gradlew && \
    head -1 ./gradlew

# Build the JAR file with debugging
RUN echo "Running Gradle build..." && \
    ./gradlew --version && \
    ./gradlew build --info --stacktrace

# Create executables directory
RUN mkdir -p build/executables

# Build Windows executables using Launch4j
# Note: JRE bundling is optional - executables will work with system Java if JRE not bundled
RUN echo "Building Windows executables with Launch4j..." && \
    launch4jc /app/launch4j-winxp.xml && echo "✓ Windows XP executable created" && \
    launch4jc /app/launch4j-win7.xml && echo "✓ Windows 7 executable created" && \
    launch4jc /app/launch4j-win10.xml && echo "✓ Windows 10+ executable created"

# Build macOS executable (shell script wrapper)
RUN echo "Building macOS executable..." && \
    ./gradlew buildMacExe && \
    echo "✓ macOS executable created"

# Copy build artifacts to a temp location that won't be overwritten by volume mounts
RUN mkdir -p /tmp/build-output && \
    cp -r build/libs /tmp/build-output/ && \
    cp -r build/executables /tmp/build-output/

# Default command: copy artifacts to mounted volume and show results
CMD ["sh", "-c", "cp -r /tmp/build-output/libs/* /app/build/libs/ 2>/dev/null || true && cp -r /tmp/build-output/executables/* /app/build/executables/ 2>/dev/null || true && echo '\n==========================================' && echo '  Build Complete!' && echo '==========================================' && echo '\n=== JAR File ===' && ls -lh /app/build/libs/ && echo '\n=== Executables ===' && ls -lh /app/build/executables/ && echo '\n==========================================' && echo 'JAR: build/libs/java-client-1.0.0.jar' && echo '' && echo 'Windows Executables:' && echo '  Windows XP:  build/executables/node-drive-client-winxp.exe' && echo '  Windows 7:   build/executables/node-drive-client-win7.exe' && echo '  Windows 10+: build/executables/node-drive-client-win10.exe' && echo '' && echo 'macOS Executable:' && echo '  macOS:       build/executables/node-drive-client-macos' && echo '==========================================\n'"]
