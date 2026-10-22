package flash.media
{
   [API("688")]
   public class AVCaptionStyle
   {
      
      public static const DEFAULT:String = "default";
      
      public static const MONOSPACE_WITH_SERIFS:String = "monospaced_with_serifs";
      
      public static const PROPORTIONAL_WITH_SERIFS:String = "proportional_with_serifs";
      
      public static const MONOSPACED_WITHOUT_SERIFS:String = "monospaced_without_serifs";
      
      public static const PROPORTIONAL_WITHOUT_SERIFS:String = "proportional_without_serifs";
      
      public static const CASUAL:String = "casual";
      
      public static const CURSIVE:String = "cursive";
      
      public static const SMALL_CAPITALS:String = "small_capitals";
      
      public static const BLACK:String = "black";
      
      public static const GRAY:String = "gray";
      
      public static const WHITE:String = "white";
      
      public static const BRIGHT_WHITE:String = "bright_white";
      
      public static const DARK_RED:String = "dark_red";
      
      public static const RED:String = "red";
      
      public static const BRIGHT_RED:String = "bright_red";
      
      public static const DARK_GREEN:String = "dark_green";
      
      public static const GREEN:String = "green";
      
      public static const BRIGHT_GREEN:String = "bright_green";
      
      public static const DARK_BLUE:String = "dark_blue";
      
      public static const BLUE:String = "blue";
      
      public static const BRIGHT_BLUE:String = "bright_blue";
      
      public static const DARK_YELLOW:String = "dark_yellow";
      
      public static const YELLOW:String = "yellow";
      
      public static const BRIGHT_YELLOW:String = "bright_yellow";
      
      public static const DARK_MAGENTA:String = "dark_magenta";
      
      public static const MAGENTA:String = "magenta";
      
      public static const BRIGHT_MAGENTA:String = "bright_magenta";
      
      public static const DARK_CYAN:String = "dark_cyan";
      
      public static const CYAN:String = "cyan";
      
      public static const BRIGHT_CYAN:String = "bright_cyan";
      
      public static const NONE:String = "none";
      
      public static const RAISED:String = "raised";
      
      public static const DEPRESSED:String = "depressed";
      
      public static const UNIFORM:String = "uniform";
      
      public static const LEFT_DROP_SHADOW:String = "drop_shadow_left";
      
      public static const RIGHT_DROP_SHADOW:String = "drop_shadow_right";
      
      public static const SMALL:String = "small";
      
      public static const MEDIUM:String = "medium";
      
      public static const LARGE:String = "large";
      
      private var m_font:String;
      
      private var m_fontColor:String;
      
      private var m_fontEdge:String;
      
      private var m_edgeColor:String;
      
      private var m_backgroundColor:String;
      
      private var m_fillColor:String;
      
      private var m_fontOpacity:String;
      
      private var m_backgroundOpacity:String;
      
      private var m_fillOpacity:String;
      
      private var m_size:String;
      
      private var m_bottomInset:String;
      
      public function AVCaptionStyle()
      {
         super();
         this.m_font = "";
         this.m_fontColor = "";
         this.m_fontEdge = "";
         this.m_edgeColor = "";
         this.m_backgroundColor = "";
         this.m_fillColor = "";
         this.m_fontOpacity = "";
         this.m_backgroundOpacity = "";
         this.m_fillOpacity = "";
         this.m_size = "";
         this.m_bottomInset = "0";
      }
      
      public function get font() : String
      {
         return this.m_font;
      }
      
      public function set font(val:String) : void
      {
         this.m_font = val;
      }
      
      public function get fontColor() : String
      {
         return this.m_fontColor;
      }
      
      public function set fontColor(val:String) : void
      {
         this.m_fontColor = val;
      }
      
      public function get fontEdge() : String
      {
         return this.m_fontEdge;
      }
      
      public function set fontEdge(val:String) : void
      {
         this.m_fontEdge = val;
      }
      
      public function get edgeColor() : String
      {
         return this.m_edgeColor;
      }
      
      public function set edgeColor(val:String) : void
      {
         this.m_edgeColor = val;
      }
      
      public function get backgroundColor() : String
      {
         return this.m_backgroundColor;
      }
      
      public function set backgroundColor(val:String) : *
      {
         this.m_backgroundColor = val;
      }
      
      public function get fillColor() : String
      {
         return this.m_fillColor;
      }
      
      public function set fillColor(val:String) : *
      {
         this.m_fillColor = val;
      }
      
      public function get fontOpacity() : String
      {
         return this.m_fontOpacity;
      }
      
      public function set fontOpacity(val:String) : void
      {
         this.m_fontOpacity = val;
      }
      
      public function get backgroundOpacity() : String
      {
         return this.m_backgroundOpacity;
      }
      
      public function set backgroundOpacity(val:String) : void
      {
         this.m_backgroundOpacity = val;
      }
      
      public function get fillOpacity() : String
      {
         return this.m_fillOpacity;
      }
      
      public function set fillOpacity(val:String) : void
      {
         this.m_fillOpacity = val;
      }
      
      public function get size() : String
      {
         return this.m_size;
      }
      
      public function set size(val:String) : void
      {
         this.m_size = val;
      }
      
      public function get bottomInset() : String
      {
         return this.m_bottomInset;
      }
      
      public function set bottomInset(value:String) : void
      {
         this.m_bottomInset = value;
      }
   }
}

