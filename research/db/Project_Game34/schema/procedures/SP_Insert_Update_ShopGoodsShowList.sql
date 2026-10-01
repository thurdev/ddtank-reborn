-- SQL_STORED_PROCEDURE dbo.SP_Insert_Update_ShopGoodsShowList (modified 2021-06-04T01:29:18.250)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Insert_Update_ShopGoodsShowList] 
		   @Type int,
           @ShopId int,
           @setUpdate int
AS
begin
insert into [dbo].[ShopGoodsShowList]
           ([Type]
           ,[ShopId])
     VALUES
           (@Type,
           @ShopId)
           
return 0
           end



declare @count int

select @count= isnull(count(*),0) from [dbo].[ShopGoodsShowList] where [ShopId] = @ShopId
if (@count <> 0 and @setUpdate = 0)
begin
  UPDATE [dbo].[ShopGoodsShowList]
   SET [Type] = @Type
      ,[ShopId] = @ShopId
 WHERE [ShopId] = @ShopId
    
return 1  
end
--add Ball
else 
begin
insert into [dbo].[ShopGoodsShowList]
           ([Type]
           ,[ShopId])
     VALUES
           (@Type,
           @ShopId)
           
return 0
           end
if(@@error <> 0)
begin
  return 2 ---Return false insert error
end









GO
