package flash.accessibility
{
   import flash.geom.Rectangle;
   
   public class AccessibilityImplementation
   {
      
      public var stub:Boolean;
      
      public var errno:uint;
      
      public function AccessibilityImplementation()
      {
         super();
         this.stub = false;
         this.errno = 0;
      }
      
      public function get_accRole(childID:uint) : uint
      {
         Error.throwError(Error,2143);
         return null;
      }
      
      public function get_accName(childID:uint) : String
      {
         return null;
      }
      
      public function get_accValue(childID:uint) : String
      {
         return null;
      }
      
      public function get_accState(childID:uint) : uint
      {
         Error.throwError(Error,2144);
         return null;
      }
      
      public function get_accDefaultAction(childID:uint) : String
      {
         return null;
      }
      
      public function accDoDefaultAction(childID:uint) : void
      {
      }
      
      public function isLabeledBy(labelBounds:Rectangle) : Boolean
      {
         return false;
      }
      
      public function getChildIDArray() : Array
      {
         return null;
      }
      
      public function accLocation(childID:uint) : *
      {
         return null;
      }
      
      public function get_accSelection() : Array
      {
         return null;
      }
      
      public function get_accFocus() : uint
      {
         return 0;
      }
      
      public function accSelect(operation:uint, childID:uint) : void
      {
      }
      
      [cppcall]
      [API("736")]
      public function get_selectionAnchorIndex() : *
      {
         return this["selectionAnchorIndex"];
      }
      
      [cppcall]
      [API("736")]
      public function get_selectionActiveIndex() : *
      {
         return this["selectionActiveIndex"];
      }
   }
}

