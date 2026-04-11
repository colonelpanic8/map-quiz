{
  description = "Hermetic Nix flake for the map-quiz app";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
      forAllSystems = f:
        nixpkgs.lib.genAttrs systems (system:
          f {
            pkgs = import nixpkgs { inherit system; };
          });
    in
    {
      packages = forAllSystems ({ pkgs }: {
        default = pkgs.buildNpmPackage {
          pname = "map-quiz";
          version = "0.1.0";
          src = self;

          npmDepsHash = "sha256-SBJASYoa77GPJ8YkDR+jSRlDV9NnP3vQwhaEQxcEe3c=";

          npmBuildScript = "build";

          installPhase = ''
            runHook preInstall

            mkdir -p $out/share/map-quiz
            cp -r dist/* $out/share/map-quiz/

            runHook postInstall
          '';
        };
      });

      devShells = forAllSystems ({ pkgs }: {
        default = pkgs.mkShell {
          packages = with pkgs; [
            nodejs
          ];
        };
      });
    };
}
