import { AvatarCreator } from "@readyplayerme/react-avatar-creator";
import * as BABYLON from "babylonjs";
import "babylonjs-loaders";
import React, { useEffect, useRef, useState } from "react";
import "./ReadyPlayerMeAvatar.css";

// Default subdomain for Ready Player Me
const RPM_SUBDOMAIN = "demo";

const ReadyPlayerMeAvatar = ({
  canvasRef,
  onAvatarLoaded,
}) => {
  // Get avatar URL from localStorage or use null
  const savedAvatarUrl = localStorage.getItem("rpmAvatarUrl");
  const [avatarUrl, setAvatarUrl] = useState(savedAvatarUrl || null);
  const [showCreator, setShowCreator] = useState(!savedAvatarUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [avatarError, setAvatarError] = useState(null);
  const avatarRef = useRef(null);
  const sceneRef = useRef(null);

  // Initialize Babylon.js scene
  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new BABYLON.Engine(canvasRef.current, true);
    const scene = new BABYLON.Scene(engine);

    // Configure scene
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);

    // Create camera
    const camera = new BABYLON.ArcRotateCamera(
      "camera",
      -Math.PI / 2,
      Math.PI / 2.5,
      3,
      new BABYLON.Vector3(0, 1, 0),
      scene
    );
    camera.attachControl(canvasRef.current, true);
    camera.lowerRadiusLimit = 1.5;
    camera.upperRadiusLimit = 8;

    // Add lighting
    const light1 = new BABYLON.HemisphericLight(
      "light1",
      new BABYLON.Vector3(0, 1, 0),
      scene
    );
    light1.intensity = 0.7;

    const light2 = new BABYLON.DirectionalLight(
      "light2",
      new BABYLON.Vector3(0, -1, 1),
      scene
    );
    light2.intensity = 0.5;

    // Run render loop
    engine.runRenderLoop(() => {
      scene.render();
    });

    // Handle browser resize
    window.addEventListener("resize", () => {
      engine.resize();
    });

    sceneRef.current = { scene, engine };

    // Load avatar if URL exists
    if (avatarUrl) {
      loadAvatar(avatarUrl);
    }

    // Cleanup on unmount
    return () => {
      window.removeEventListener("resize", engine.resize);
      engine.dispose();
      scene.dispose();
    };
  }, [canvasRef]);

  // Load avatar when URL changes
  useEffect(() => {
    if (avatarUrl && sceneRef.current) {
      loadAvatar(avatarUrl);
    }
  }, [avatarUrl]);

  // Effect to handle avatar errors by showing the avatar creator
  useEffect(() => {
    if (avatarError) {
      // Clear the stored URL if it's causing errors
      if (localStorage.getItem("rpmAvatarUrl")) {
        localStorage.removeItem("rpmAvatarUrl");
      }

      // Show the avatar creator when there's an error
      setShowCreator(true);

      // Clear the error since we're handling it
      setAvatarError(null);
      setAvatarUrl(null);
    }
  }, [avatarError]);

  // Handle avatar creator completion
  const handleAvatarExported = (response) => {
    console.log("Avatar created with URL:", response);

    // Extract the URL from the response object
    // The response can be either a direct URL string (old API) or an object with data.url (new API)
    const urlValue =
      typeof response === "object" && response.data
        ? response.data.url
        : response;

    // Ensure the URL points to a GLB file
    const avatarUrl =
      typeof urlValue === "string" && urlValue.endsWith(".glb")
        ? urlValue
        : `${urlValue}.glb`;

    // Add cache-busting parameter to force reload of the model
    const cacheBustedUrl = avatarUrl.includes("?")
      ? `${avatarUrl}&t=${Date.now()}`
      : `${avatarUrl}?t=${Date.now()}`;

    console.log("Saving new avatar URL:", cacheBustedUrl);

    // Save to localStorage and update state
    localStorage.setItem("rpmAvatarUrl", cacheBustedUrl);

    // Set loading state before changing URL to ensure visual feedback
    setIsLoading(true);

    // Clear current avatar reference to force complete reload
    if (avatarRef.current) {
      avatarRef.current = null;
    }

    // Update the avatar URL with a slight delay to ensure clean scene transition
    setTimeout(() => {
      setAvatarUrl(cacheBustedUrl);
      setShowCreator(false);
    }, 100);
  };

  // Load Ready Player Me avatar
  const loadAvatar = async (url) => {
    if (!sceneRef.current || !sceneRef.current.scene) return;

    setIsLoading(true);
    setAvatarError(null);

    try {
      console.log("Loading avatar from URL:", url);
      const { scene } = sceneRef.current;

      // More thorough cleanup of existing avatar and all its children
      if (avatarRef.current) {
        console.log("Disposing previous avatar...");
        // Dispose all meshes associated with the previous avatar
        if (Array.isArray(avatarRef.current.getChildMeshes)) {
          const childMeshes = avatarRef.current.getChildMeshes();
          childMeshes.forEach((mesh) => {
            if (mesh.material) {
              mesh.material.dispose();
            }
            mesh.dispose();
          });
        }
        // Dispose the root mesh
        avatarRef.current.dispose();
        avatarRef.current = null;
      }

      // Clear any other meshes in the scene that might be from previous loads
      const sceneMeshes = scene.meshes.slice(); // Create a copy to avoid modification during iteration
      sceneMeshes.forEach((mesh) => {
        // Only dispose meshes that aren't part of the scene infrastructure
        if (mesh.name !== "camera" && !mesh.name.includes("light")) {
          if (mesh.material) {
            mesh.material.dispose();
          }
          mesh.dispose();
        }
      });

      // Ensure we have a full URL
      const fullUrl = url.startsWith("http")
        ? url
        : `https://models.readyplayer.me/${url}`;

      console.log("Loading new avatar from:", fullUrl);

      // Load avatar using ImportMesh for better error handling
      BABYLON.SceneLoader.ImportMesh(
        "",
        fullUrl,
        "",
        scene,
        (meshes, particleSystems, skeletons, animationGroups) => {
          console.log(
            "Avatar loaded successfully:",
            meshes.length,
            "meshes and",
            skeletons.length,
            "skeletons",
            animationGroups.length
          );

          if (meshes.length === 0) {
            setAvatarError("Avatar loaded but no meshes were found");
            setIsLoading(false);
            return;
          }

          const avatarMesh = meshes[0];
          avatarMesh.scaling = new BABYLON.Vector3(1, 1, 1);
          avatarMesh.position = new BABYLON.Vector3(0, 0, 0);

          avatarRef.current = avatarMesh;

          // Notify parent that avatar is loaded
          if (onAvatarLoaded) {
            onAvatarLoaded(avatarMesh);
          }

          setIsLoading(false);
        },
        (progressEvent) => {
          // Progress update
          const loadProgress = progressEvent.lengthComputable
            ? Math.round((progressEvent.loaded / progressEvent.total) * 100)
            : 0;
          console.log(`Loading avatar: ${loadProgress}%`);
        },
        (scene, message, exception) => {
          console.error("Error loading avatar:", message, exception);
          setAvatarError(`Failed to load avatar: ${message}`);
          setIsLoading(false);
        }
      );
    } catch (error) {
      console.error("Error loading Ready Player Me avatar:", error);
      setAvatarError(`Failed to load avatar: ${error.message}`);
      setIsLoading(false);
    }
  };

  // Reset camera to default position
  const resetCamera = () => {
    if (sceneRef.current && sceneRef.current.scene) {
      const camera = sceneRef.current.scene.getCameraByName("camera");
      if (camera && camera instanceof BABYLON.ArcRotateCamera) {
        camera.alpha = -Math.PI / 2;
        camera.beta = Math.PI / 2.5;
        camera.radius = 3;
        camera.target = new BABYLON.Vector3(0, 1, 0);
      }
    }
  };

  return (
    <div className="ready-player-me-avatar">
      {isLoading && <div className="avatar-loading">Loading avatar...</div>}

      {!avatarUrl && !showCreator && !isLoading && (
        <div className="no-avatar-message">
          <p>No avatar created yet</p>
          <button
            className="customize-avatar-button"
            onClick={() => setShowCreator(true)}
          >
            Create Avatar
          </button>
        </div>
      )}

      {avatarUrl && !showCreator && (
        <button
          className="customize-avatar-button"
          onClick={() => setShowCreator(true)}
        >
          Customize Avatar
        </button>
      )}

      {/* Close button rendered outside the container, at the top level */}
      {showCreator && (
        <button
          className="creator-close-button"
          onClick={() => setShowCreator(false)}
          aria-label="Close avatar creator"
        >
          Close Editor
        </button>
      )}

      {/* Avatar creator container without the close button inside */}
      {showCreator && (
        <div className="avatar-creator-container">
          <AvatarCreator
            subdomain={RPM_SUBDOMAIN}
            className="avatar-creator"
            onAvatarExported={handleAvatarExported}
            onUserSet={() => console.log("User is set in AvatarCreator")}
            onError={(error) => {
              console.error("Avatar Creator error:", error);
              // Even if there's an error with the creator, keep it open
              // so the user can try again instead of going back to an error state
              setShowCreator(true);
            }}
            // Pass the current avatar URL to load it for editing
            avatarId={
              avatarUrl &&
              avatarUrl.split("/").pop().split(".")[0].split("?")[0]
            }
            // Allow editing full body avatar
            bodyType="fullbody"
            // Ensure the latest version of the avatar is loaded (avoid caching)
            clearCache={true}
          />
        </div>
      )}
    </div>
  );
};

export default ReadyPlayerMeAvatar;
