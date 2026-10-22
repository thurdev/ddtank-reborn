package flash.display
{
   [native(cls="MovieClipClass",gc="exact",instance="MovieClipObject",methods="auto")]
   public dynamic class MovieClip extends Sprite
   {
      
      public function MovieClip()
      {
         super();
      }
      
      public native function get currentFrame() : int;
      
      public native function get framesLoaded() : int;
      
      public native function get totalFrames() : int;
      
      public native function get trackAsMenu() : Boolean;
      
      public native function set trackAsMenu(param1:Boolean) : void;
      
      public native function play() : void;
      
      public native function stop() : void;
      
      public native function nextFrame() : void;
      
      public native function prevFrame() : void;
      
      public native function gotoAndPlay(param1:Object, param2:String = null) : void;
      
      public native function gotoAndStop(param1:Object, param2:String = null) : void;
      
      [Inspectable(environment="none")]
      public native function addFrameScript(... rest) : void;
      
      public native function get scenes() : Array;
      
      public native function get currentScene() : Scene;
      
      public native function get currentLabel() : String;
      
      [Version("10")]
      public native function get currentFrameLabel() : String;
      
      public function get currentLabels() : Array
      {
         return this.currentScene.labels;
      }
      
      public native function prevScene() : void;
      
      public native function nextScene() : void;
      
      public native function get enabled() : Boolean;
      
      public native function set enabled(param1:Boolean) : void;
      
      [API("674")]
      public native function get isPlaying() : Boolean;
   }
}

