-- SQL_STORED_PROCEDURE dbo.SP_Pyramid_Add (modified 2015-01-25T14:04:48.650)
CREATE PROCEDURE [dbo].[SP_Pyramid_Add]			
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
BEGIN    
    INSERT INTO [dbo].[Pyramid_Data]
           ([UserID]
           ,[currentLayer]
           ,[maxLayer]
           ,[totalPoint]
           ,[turnPoint]
           ,[pointRatio]
           ,[currentFreeCount]
           ,[currentReviveCount]
           ,[isPyramidStart]
           ,[LayerItems])
     VALUES
           (@UserID
           ,@currentLayer
           ,@maxLayer
           ,@totalPoint
           ,@turnPoint
           ,@pointRatio
           ,@currentFreeCount
           ,@currentReviveCount
           ,@isPyramidStart
           ,@LayerItems)
	select @@identity as 'identity'
    set @ID=@@identity 
	return 0
	
	if(@@error <> 0)
	begin
	  return 1
	end

END

GO
