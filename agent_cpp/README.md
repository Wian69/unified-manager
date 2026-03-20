# Unified Enterprise Agent (C++) - Build Instructions

Follow these steps to compile the C++ source into a standalone `.exe` program.

## 1. Environment Setup
- Open **Visual Studio 2022**.
- Select **"Create a new project"**.
- Choose **"Empty Project (C++)"**.
- Name it `UnifiedAgent`.

## 2. Project Configuration
- Right-click your project in the **Solution Explorer** and go to **Properties**.
- Under **Configuration Properties** > **Linker** > **Input**, add `winhttp.lib;` to **Additional Dependencies**.
- Set **Configuration** to `Release` and **Platform** to `x64`.
- **Ensure C++17 or higher** is selected in General properties.

## 3. Add Source Code
- Add all the following files to your project:
  - `main.cpp`
  - `AuthManager.hpp / .cpp`
  - `GraphClient.hpp / .cpp`
  - `DefenderModule.hpp / .cpp`
  - `SharePointModule.hpp / .cpp`
  - `EmailModule.hpp / .cpp`
  - `OffboardingModule.hpp / .cpp`

## 4. Build
- Go to the top menu: **Build** > **Build Solution**.
- Your binary will be located at `x64\Release\UnifiedAgent.exe`.

## 4. Installation & Persistence
To install the agent as a persistent background service (SYSTEM level), run the compiled `.exe` from an Administrator command prompt:
```cmd
UnifiedAgent.exe --install
```
This will:
1. Register the program as a Windows Service named `UnifiedEnterpriseAgent`.
2. Configure it to start automatically with Windows.
3. Allow it to run in the background with zero user interaction.

### Managing the Service
- **Start/Stop**: Use the "Services" app (`services.msc`) or `net start UnifiedEnterpriseAgent`.
- **Diagnostics**: The agent will output console logs during manual execution, or you can add file logging to the source code.

---

### Features & Security
- **Static Linking**: The agent is designed to be a "Single File" binary.
- **Stealth**: For a truly hidden agent, change the `main` function to `WinMain` to prevent the console window from appearing.
- **Native Efficiency**: CPU usage is near 0% while idle in the heartbeat loop.
