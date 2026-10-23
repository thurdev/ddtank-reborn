package road7th.game.model
{
   import com.pickgliss.ui.core.Disposeable;
   import flash.display.BitmapData;
   import road7th.manager.PathManager;
   
   public class MapInfo implements Disposeable
   {
      
      public static var G:Number = 0.98;
      
      public var id:int;
      
      public var backData:BitmapData;
      
      public var npcs:Array;
      
      public var music:String;
      
      private var _deadData:BitmapData;
      
      public var ID:int;
      
      public var Name:String;
      
      public var isOpen:Boolean;
      
      public var canSelect:Boolean;
      
      public var ForegroundWidth:Number;
      
      public var ForegroundHeight:Number;
      
      public var ForePic:String;
      
      public var BackroundWidht:Number;
      
      public var BackroundHeight:Number;
      
      public var BackPic:String;
      
      public var DeadWidth:Number;
      
      public var DeadHeight:Number;
      
      public var DeadPic:String;
      
      public var Pic:String;
      
      public var Description:String;
      
      public var BackMusic:String = "050";
      
      public var Weight:int;
      
      public var Wind:Number;
      
      public var DragIndex:int;
      
      public var Type:int;
      
      private var _x:Number;
      
      private var _y:Number;
      
      public function MapInfo()
      {
         super();
      }
      
      public function get deadData() : BitmapData
      {
         return this._deadData;
      }
      
      public function set deadData(value:BitmapData) : void
      {
         if(this._deadData == value)
         {
            return;
         }
         this._deadData = value;
         this.ForegroundWidth = this._deadData.width;
         this.ForegroundHeight = this._deadData.height;
      }
      
      public function get backPath() : String
      {
         return PathManager.mapback.replace("{id}",this.id);
      }
      
      public function get deadPath() : String
      {
         return PathManager.mapdead.replace("{id}",this.id);
      }
      
      public function dispose() : void
      {
      }
      
      public function get x() : Number
      {
         return this._x;
      }
      
      public function set x(value:Number) : void
      {
         if(this._x == value)
         {
            return;
         }
         this._x = value;
      }
      
      public function get y() : Number
      {
         return this._y;
      }
      
      public function set y(value:Number) : void
      {
         if(this._y == value)
         {
            return;
         }
         this._y = value;
      }
   }
}

