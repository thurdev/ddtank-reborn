-- SQL_STORED_PROCEDURE dbo.SP_UpdatePyramid (modified 2015-01-25T14:04:48.220)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：更新人物物品信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_UpdatePyramid] 
			@ID int output
           ,@UserID int
           ,@currentLayer int
           ,@maxLayer int
           ,@totalPoint int
           ,@turnPoint int
           ,@pointRatio int
           ,@currentFreeCount int
           ,@currentReviveCount int
           ,@isPyramidStart bit
           ,@LayerItems nvarchar(1500)
 AS    
   begin 
UPDATE [dbo].[Pyramid_Data]
   SET [currentLayer] = @currentLayer
      ,[maxLayer] = @maxLayer
      ,[totalPoint] = @totalPoint
      ,[turnPoint] = @turnPoint
      ,[pointRatio] = @pointRatio
      ,[currentFreeCount] = @currentFreeCount
      ,[currentReviveCount] = @currentReviveCount
      ,[isPyramidStart] = @isPyramidStart
      ,[LayerItems] = @LayerItems
 WHERE [UserID] = @UserID

   return 0
   end
if(@@error <> 0)
begin
 return 1 
end

GO
