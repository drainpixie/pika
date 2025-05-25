{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    utils.url = "github:numtide/flake-utils";
    hooks.url = "github:cachix/git-hooks.nix";
  };

  outputs = {
    self,
    utils,
    hooks,
    nixpkgs,
  }:
    utils.lib.eachDefaultSystem (
      system: let
        pkgs = import nixpkgs {inherit system;};
        check = self.checks.${system}.pre-commit-check;
      in {
        devShell = pkgs.mkShell {
          inherit (check) shellHook;
          packages =
            builtins.attrValues {
              inherit (pkgs.nodePackages) pnpm typescript typescript-language-server nodejs;
            }
            ++ check.enabledPackages;
        };

        checks = {
          pre-commit-check = hooks.lib.${system}.run {
            src = ./.;
            hooks = {
              biome.enable = true;
              convco.enable = true;
              alejandra.enable = true;
            };
          };
        };
      }
    );
}
