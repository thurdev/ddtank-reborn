package road7th.game.animations
{
   import flash.display.DisplayObject;
   import flash.geom.Point;
   
   public class BaseSetCenterAnimation extends BaseAnimate
   {
      
      protected var _target:Point;
      
      protected var _life:int;
      
      protected var _directed:Boolean;
      
      protected var _speed:int;
      
      protected var _moveSpeed:int = 4;
      
      public function BaseSetCenterAnimation(cx:Number, cy:Number, life:int = 0, directed:Boolean = false, level:int = 0, speed:int = 4, data:Object = null)
      {
         super();
         this._target = new Point(cx,cy);
         _finished = false;
         this._life = life;
         _level = level;
         this._directed = directed;
         this._speed = speed;
      }
      
      override public function canAct() : Boolean
      {
         return !_finished || this._life >= 0;
      }
      
      override public function prepare(aniset:AnimationSet) : void
      {
         this._target.x = aniset.stageWidth / 2 - this._target.x;
         this._target.y = aniset.stageHeight / 2 - this._target.y;
         this._target.x = this._target.x < aniset.minX ? Number(aniset.minX) : (this._target.x > 0 ? 0 : Number(this._target.x));
         this._target.y = this._target.y < aniset.minY ? Number(aniset.minY) : (this._target.y > 0 ? 0 : Number(this._target.y));
      }
      
      override public function update(movie:DisplayObject) : Boolean
      {
         var p:* = undefined;
         p = null;
         --this._life;
         if(!_finished)
         {
            if(!this._directed)
            {
               p = new Point(this._target.x - movie.x,this._target.y - movie.y);
               if(this._speed > 0 && p.length > 48)
               {
                  movie.x += p.x / this._speed;
                  movie.y += p.y / this._speed;
                  return true;
               }
               if(p.length > 48)
               {
                  movie.x += p.x / this._moveSpeed;
                  movie.y += p.y / this._moveSpeed;
               }
               else if(p.length >= 8)
               {
                  p.normalize(8);
                  movie.x += p.x;
                  movie.y += p.y;
               }
               else
               {
                  movie.x += p.x;
                  movie.y += p.y;
                  _finished = true;
               }
            }
            else
            {
               movie.x = this._target.x;
               movie.y = this._target.y;
               _finished = true;
            }
            return true;
         }
         return false;
      }
   }
}

