-- SQL_STORED_PROCEDURE dbo.SP_Insert_Update_Shop_Goods_Categorys (modified 2021-06-04T01:29:18.243)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Insert_Update_Shop_Goods_Categorys] 
		   @ID int,
           @Name nvarchar(50),
           @Place int,
           @Remark nvarchar(200),
           @setUpdate int
AS

declare @count int

select @count= isnull(count(*),0) from Shop_Goods_Categorys where [ID] = @ID
if (@count <> 0 and @setUpdate = 0)
begin
  UPDATE [dbo].[Shop_Goods_Categorys]
   SET [ID] = @ID
      ,[Name] = @Name
      ,[Place] = @Place
      ,[Remark] = @Remark
 WHERE [ID] = @ID
    
return 1  
end
--add Ball
else 
begin
INSERT INTO [dbo].[Shop_Goods_Categorys]
           ([ID]
           ,[Name]
           ,[Place]
           ,[Remark])
     VALUES
           (@ID,
           @Name,
           @Place,
           @Remark)
           
return 0
           end
if(@@error <> 0)
begin
  return 2 ---Return false insert error
end









GO
