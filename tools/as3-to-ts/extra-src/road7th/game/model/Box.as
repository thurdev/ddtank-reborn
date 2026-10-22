package road7th.game.model
{
   public class Box
   {
      
      private var _x:Number;
      
      private var _y:Number;
      
      private var _className:String;
      
      private var _name:String;
      
      public function Box(id:int = 0)
      {
         super();
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
      
      public function get className() : String
      {
         return this._className;
      }
      
      public function set className(value:String) : void
      {
         if(this._className == value)
         {
            return;
         }
         this._className = value;
      }
      
      public function get name() : String
      {
         return this._name;
      }
      
      public function set name(value:String) : void
      {
         if(this._name == value)
         {
            return;
         }
         this._name = value;
      }
   }
}

