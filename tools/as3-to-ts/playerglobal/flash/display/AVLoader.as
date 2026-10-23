package flash.display
{
   import flash.net.URLRequest;
   import flash.system.*;
   
   [native(cls="AVLoaderClass",instance="AVLoaderObject",methods="auto")]
   [API("688")]
   public class AVLoader extends Loader
   {
      
      public function AVLoader()
      {
         super();
      }
      
      private static function cloneParams(lc:LoaderContext) : void
      {
         var k:String = null;
         var args:Object = lc.parameters;
         var rtn:Object = {};
         for(k in args)
         {
            rtn[k] = args[k];
         }
         lc.parameters = rtn;
      }
      
      override public function load(request:URLRequest, context:LoaderContext = null) : void
      {
         var _context:LoaderContext = this._buildLoaderContext(context);
         var deblockingFilter:Number = 0;
         if(_context.imageDecodingPolicy == null)
         {
            throw new ArgumentError();
         }
         deblockingFilter = Number(this._getJPEGLoaderContextdeblockingfilter(_context));
         if(_context.parameters != null)
         {
            cloneParams(_context);
         }
         this._load(request,_context.checkPolicyFile,_context.applicationDomain,_context.securityDomain,_context.requestedContentParent,_context.parameters,deblockingFilter,_context.allowCodeImport,_context.imageDecodingPolicy);
      }
      
      private native function _getJPEGLoaderContextdeblockingfilter(param1:Object) : Number;
      
      private function _buildLoaderContext(context:LoaderContext) : LoaderContext
      {
         if(context == null)
         {
            context = new LoaderContext();
         }
         if(context.applicationDomain == null)
         {
            context.applicationDomain = new ApplicationDomain(ApplicationDomain.currentDomain);
         }
         return context;
      }
      
      private native function _load(param1:URLRequest, param2:Boolean, param3:ApplicationDomain, param4:SecurityDomain, param5:DisplayObjectContainer, param6:Object, param7:Number, param8:Boolean, param9:String) : void;
   }
}

