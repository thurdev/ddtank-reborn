-- SQL_STORED_PROCEDURE dbo.SP_UpdateTreasureData (modified 2015-01-25T14:04:48.220)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：更新人物物品信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_UpdateTreasureData] 
			@ID int   
		   ,@UserID int
           ,@TemplateID int
           ,@Count int
           ,@Validate int
           ,@Pos int
           ,@BeginDate datetime
           ,@IsExit bit
                      
 AS    
   begin 
UPDATE [dbo].[Treasure_Data]
   SET [TemplateID] = @TemplateID
      ,[Count] = @Count
      ,[Validate] = @Validate
      ,[Pos] = @Pos
      ,[BeginDate] = @BeginDate
      ,[IsExit] = @IsExit
 WHERE [ID] = @ID

   return 0
   end
if(@@error <> 0)
begin
 return 1 
end

GO
