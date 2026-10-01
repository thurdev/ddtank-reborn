-- SQL_STORED_PROCEDURE dbo.SP_UpdateGemStoneInfo (modified 2022-02-20T07:41:39.253)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：更新人物物品信息>
-- =============================================
CREATE PROCEDURE [dbo].[SP_UpdateGemStoneInfo]   
			@ID int
		   ,@UserID int
           ,@FigSpiritId int
           ,@FigSpiritIdValue nvarchar(50)
           ,@EquipPlace int
           
           
 AS    
   begin 

UPDATE [dbo].[Sys_User_Gemstone]
   SET [FigSpiritId] = @FigSpiritId
      ,[FigSpiritIdValue] = @FigSpiritIdValue
      ,[EquipPlace] = @EquipPlace
     WHERE [ID] = @ID
  return 0
    end
if(@@error <> 0)
begin
  return 1
  end

GO
