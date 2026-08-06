declare module "three";

declare module "three/examples/jsm/loaders/GLTFLoader.js" {
  export class GLTFLoader {
    loadAsync(url: string): Promise<{ scene: any }>;
  }
}
