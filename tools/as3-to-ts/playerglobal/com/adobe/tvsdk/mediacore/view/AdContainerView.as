package com.adobe.tvsdk.mediacore.view
{
   import flash.display.Sprite;
   import flash.events.*;
   
   [API("712")]
   public class AdContainerView extends Sprite
   {
      
      private var _width:Number = 0;
      
      private var _height:Number = 0;
      
      public function AdContainerView()
      {
         super();
      }
      
      override public function get width() : Number
      {
         return this._width;
      }
      
      override public function set width(value:Number) : void
      {
         this._width = value;
         this.setSize(value,this._height);
      }
      
      override public function get height() : Number
      {
         return this._height;
      }
      
      override public function set height(value:Number) : void
      {
         this._height = value;
         this.setSize(this._width,value);
      }
      
      public function setSize(width:Number, height:Number) : void
      {
         this._width = width;
         this._height = height;
         dispatchEvent(new Event(Event.RESIZE));
      }
   }
}

