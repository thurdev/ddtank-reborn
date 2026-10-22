package road7th.game.animations
{
   import flash.display.DisplayObject;
   import phy.object.PhysicalObj;
   
   public class ShockMapAnimation implements IAnimate
   {
      
      private var _bomb:PhysicalObj;
      
      private var _finished:Boolean;
      
      private var _age:Number;
      
      private var _life:Number;
      
      private var _radius:Number;
      
      private var _x:Number;
      
      private var _y:Number;
      
      public function ShockMapAnimation(bomb:PhysicalObj, radius:Number = 7, life:Number = 0)
      {
         super();
         this._age = 0;
         this._life = life;
         this._finished = false;
         this._bomb = bomb;
         this._radius = radius;
      }
      
      public function get level() : int
      {
         return AnimationLevel.HIGHT;
      }
      
      public function canAct() : Boolean
      {
         return !this._finished || this._life > 0;
      }
      
      public function canReplace(anit:IAnimate) : Boolean
      {
         return true;
      }
      
      public function prepare(aniset:AnimationSet) : void
      {
      }
      
      public function cancel() : void
      {
         this._finished = true;
         this._life = 0;
      }
      
      public function update(movie:DisplayObject) : Boolean
      {
         --this._life;
         if(!this._finished)
         {
            if(this._age == 0)
            {
               this._x = movie.x;
               this._y = movie.y;
            }
            this._age += 0.25;
            if(this._age < 1.5)
            {
               this._radius = -this._radius;
               movie.x = this._x + this._radius;
               movie.y = this._y + this._radius;
            }
            else
            {
               movie.x = this._x;
               movie.y = this._y;
               this._finished = true;
            }
            return true;
         }
         return false;
      }
      
      public function get finish() : Boolean
      {
         return this._finished;
      }
   }
}

