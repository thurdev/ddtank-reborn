-- SQL_STORED_PROCEDURE dbo.SP_Insert_Update_ShopItemList (modified 2021-06-04T01:29:18.260)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：加入一条用户申请结婚信息>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Insert_Update_ShopItemList]
           @ID float,
           @ShopID float,
           @GroupID float,
           @TemplateID float,
           @BuyType float,
           @IsContinue bit,
           @IsBind float,
           @IsVouch float,
           @Label float,
           @Beat float,
           @AUnit float,
           @APrice1 float,
           @AValue1 float,
           @APrice2 float,
           @AValue2 float,
           @APrice3 float,
           @AValue3 float,
           @BUnit float,
           @BPrice1 float,
           @BValue1 float,
           @BPrice2 float,
           @BValue2 float,
           @BPrice3 float,
           @BValue3 float,
           @CUnit float,
           @CPrice1 float,
           @CValue1 float,
           @CPrice2 float,
           @CValue2 float,
           @CPrice3 float,
           @Sort float,
           @CValue3 float,
           @IsCheap bit,
           @LimitCount float,
           @StartDate datetime,
           @EndDate datetime,
           @setUpdate int

AS
declare @count int

select @count= isnull(count(*),0) from Shop where ID = @ID
if (@count <> 0 and @setUpdate = 0)
begin
  update [dbo].[Shop] 
set    [ID] = @ID
      ,[ShopID] = @ShopID
      ,[GroupID] = @GroupID
      ,[TemplateID] = @TemplateID
      ,[BuyType] = @BuyType
      ,[IsContinue] = @IsContinue
      ,[IsBind] = @IsBind
      ,[IsVouch] = @IsVouch
      ,[Label] = @Label
      ,[Beat] = @Beat
      ,[AUnit] = @AUnit
      ,[APrice1] = @APrice1
      ,[AValue1] = @AValue1
      ,[APrice2] = @APrice2
      ,[AValue2] = @AValue2
      ,[APrice3] = @APrice3
      ,[AValue3] = @AValue3
      ,[BUnit] = @BUnit
      ,[BPrice1] = @BPrice1
      ,[BValue1] = @BValue1
      ,[BPrice2] = @BPrice2
      ,[BValue2] = @BValue2
      ,[BPrice3] = @BPrice3
      ,[BValue3] = @BValue3
      ,[CUnit] = @CUnit
      ,[CPrice1] = @CPrice1
      ,[CValue1] = @CValue1
      ,[CPrice2] = @CPrice2
      ,[CValue2] = @CValue2
      ,[CPrice3] = @CPrice3
      ,[Sort] = @Sort
      ,[CValue3] = @CValue3
      ,[IsCheap] = @IsCheap
      ,[LimitCount] = @LimitCount
      ,[StartDate] = @StartDate
      ,[EndDate] = @EndDate
      where [ID]  = @ID
      
return 1

end
--add Ball
else 
begin
insert into [dbo].[Shop]
           ([ID]
           ,[ShopID]
           ,[GroupID]
           ,[TemplateID]
           ,[BuyType]
           ,[IsContinue]
           ,[IsBind]
           ,[IsVouch]
           ,[Label]
           ,[Beat]
           ,[AUnit]
           ,[APrice1]
           ,[AValue1]
           ,[APrice2]
           ,[AValue2]
           ,[APrice3]
           ,[AValue3]
           ,[BUnit]
           ,[BPrice1]
           ,[BValue1]
           ,[BPrice2]
           ,[BValue2]
           ,[BPrice3]
           ,[BValue3]
           ,[CUnit]
           ,[CPrice1]
           ,[CValue1]
           ,[CPrice2]
           ,[CValue2]
           ,[CPrice3]
           ,[Sort]
           ,[CValue3]
           ,[IsCheap]
           ,[LimitCount]
           ,[StartDate]
           ,[EndDate])
     VALUES
           (@ID,
           @ShopID,
           @GroupID,
           @TemplateID,
           @BuyType,
           @IsContinue,
           @IsBind,
           @IsVouch,
           @Label,
           @Beat,
           @AUnit,
           @APrice1,
           @AValue1,
           @APrice2,
           @AValue2,
           @APrice3,
           @AValue3,
           @BUnit,
           @BPrice1,
           @BValue1,
           @BPrice2,
           @BValue2,
           @BPrice3,
           @BValue3,
           @CUnit,
           @CPrice1,
           @CValue1,
           @CPrice2,
           @CValue2,
           @CPrice3,
           @Sort,
           @CValue3,
           @IsCheap,
           @LimitCount,
           @StartDate,
           @EndDate)
           
return 0

           end
if(@@error <> 0)
begin
  return 2 ---Return false insert error
end









GO
