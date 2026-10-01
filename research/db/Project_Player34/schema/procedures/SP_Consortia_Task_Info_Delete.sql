-- SQL_STORED_PROCEDURE dbo.SP_Consortia_Task_Info_Delete (modified 2021-08-15T03:27:44.163)

-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：更新人物物品信息>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Consortia_Task_Info_Delete]   
		   @ConsortiaID int
 AS    
	begin 
	declare @Count int
	select @Count = count(*) from Consortia_Task_Info where ConsortiaID = @ConsortiaID AND IsExist = 1
	if(@Count = 0)
		begin--khong co du lieu thi insert
			return 1 -- khong co dua lieu delete
		end
	else 
		begin
			UPDATE [dbo].[Consortia_Task_Info]
			   SET IsExist = 0
			WHERE [ConsortiaID] = @ConsortiaID AND IsExist = 1
		end
	return 0
	end
if(@@error <> 0)
begin
  return 1 ---Return false insert error
end


GO
